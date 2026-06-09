using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TagsApi.Application.DTOs;
using TagsApi.Application.Interfaces;
using TagsApi.Domain.Enums;

namespace TagsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TagsController : ControllerBase
{
    private readonly ITagService _tagService;
    private readonly IExternalTagService _externalTagService;
    private readonly IConfiguration _config;
    private readonly ILogger<TagsController> _logger;

    public TagsController(
        ITagService tagService,
        IExternalTagService externalTagService,
        IConfiguration config,
        ILogger<TagsController> logger)
    {
        _tagService = tagService;
        _externalTagService = externalTagService;
        _config = config;
        _logger = logger;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] TagQueryDto query, CancellationToken ct)
    {
        bool useExternal = _config.GetValue<bool>("UseExternalApi");
        if (useExternal)
        {
            var spaceId = _config["ClickUp:SpaceId"] ?? "";
            var tags = await _externalTagService.GetTagsFromExternalApiAsync(spaceId, ct);
            var filtered = string.IsNullOrWhiteSpace(query.Search)
                ? tags
                : tags.Where(t => t.Name.Contains(query.Search, StringComparison.OrdinalIgnoreCase)).ToList();
            return Ok(new PagedResult<TagDto>
            {
                Items = filtered,
                TotalCount = filtered.Count,
                Page = 1,
                PageSize = filtered.Count > 0 ? filtered.Count : 10
            });
        }
        var result = await _tagService.GetAllAsync(query, ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        if (_config.GetValue<bool>("UseExternalApi"))
        {
            var spaceId = _config["ClickUp:SpaceId"] ?? "";
            var tags = await _externalTagService.GetTagsFromExternalApiAsync(spaceId, ct);
            var tag = tags.FirstOrDefault(t => t.Id == id);
            if (tag == null) return NotFound(new { message = $"Tag {id} not found" });
            return Ok(tag);
        }

        var localTag = await _tagService.GetByIdAsync(id, ct);
        if (localTag == null) return NotFound(new { message = $"Tag {id} not found" });
        return Ok(localTag);
    }

    [HttpPost]
    [Authorize(Roles = UserRoles.FullAccess)]
    public async Task<IActionResult> Create([FromBody] CreateTagDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (_config.GetValue<bool>("UseExternalApi"))
        {
            var spaceId = _config["ClickUp:SpaceId"] ?? "";
            var tag = await _externalTagService.CreateTagAsync(spaceId, dto.Name, dto.Color, ct);
            return CreatedAtAction(nameof(GetById), new { id = tag.Id }, tag);
        }

        var userId = GetCurrentUserId();
        var localTag = await _tagService.CreateAsync(dto, userId, ct);
        return CreatedAtAction(nameof(GetById), new { id = localTag.Id }, localTag);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = UserRoles.FullAccess)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTagDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (_config.GetValue<bool>("UseExternalApi"))
        {
            var spaceId = _config["ClickUp:SpaceId"] ?? "";
            var tags = await _externalTagService.GetTagsFromExternalApiAsync(spaceId, ct);
            var existing = tags.FirstOrDefault(t => t.Id == id);
            if (existing == null) return NotFound(new { message = $"Tag {id} not found" });
            _logger.LogInformation("Updating tag via ClickUp: id={Id}, oldName={OldName}, newName={NewName}, color={Color}",
                id, existing.Name, dto.Name, dto.Color);
            var updated = await _externalTagService.UpdateTagAsync(spaceId, existing.Name, dto.Name, dto.Color, ct);
            if (updated == null) return NotFound(new { message = $"Tag {id} not found" });
            return Ok(updated);
        }

        var tag = await _tagService.UpdateAsync(id, dto, ct);
        if (tag == null) return NotFound(new { message = $"Tag {id} not found" });
        return Ok(tag);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = UserRoles.FullAccess)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (_config.GetValue<bool>("UseExternalApi"))
        {
            var spaceId = _config["ClickUp:SpaceId"] ?? "";
            var tags = await _externalTagService.GetTagsFromExternalApiAsync(spaceId, ct);
            var existing = tags.FirstOrDefault(t => t.Id == id);
            if (existing == null) return NotFound(new { message = $"Tag {id} not found" });
            var deleted = await _externalTagService.DeleteTagAsync(spaceId, existing.Name, ct);
            if (!deleted) return NotFound(new { message = $"Tag {id} not found" });
            return NoContent();
        }

        var localDeleted = await _tagService.DeleteAsync(id, ct);
        if (!localDeleted) return NotFound(new { message = $"Tag {id} not found" });
        return NoContent();
    }

    private Guid? GetCurrentUserId()
    {
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(idClaim, out var id) ? id : null;
    }
}