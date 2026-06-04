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

    public TagsController(
        ITagService tagService,
        IExternalTagService externalTagService,
        IConfiguration config)
    {
        _tagService = tagService;
        _externalTagService = externalTagService;
        _config = config;
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
            return Ok(new PagedResult<TagDto>
            {
                Items = tags,
                TotalCount = tags.Count,
                Page = 1,
                PageSize = tags.Count > 0 ? tags.Count : 10
            });
        }
        var result = await _tagService.GetAllAsync(query, ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var tag = await _tagService.GetByIdAsync(id, ct);
        if (tag == null) return NotFound(new { message = $"Tag {id} not found" });
        return Ok(tag);
    }

    [HttpPost]
    [Authorize(Roles = UserRoles.FullAccess)]
    public async Task<IActionResult> Create([FromBody] CreateTagDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
        var userId = GetCurrentUserId();
        var tag = await _tagService.CreateAsync(dto, userId, ct);
        return CreatedAtAction(nameof(GetById), new { id = tag.Id }, tag);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = UserRoles.FullAccess)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTagDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
        var tag = await _tagService.UpdateAsync(id, dto, ct);
        if (tag == null) return NotFound(new { message = $"Tag {id} not found" });
        return Ok(tag);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = UserRoles.FullAccess)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var deleted = await _tagService.DeleteAsync(id, ct);
        if (!deleted) return NotFound(new { message = $"Tag {id} not found" });
        return NoContent();
    }

    private Guid? GetCurrentUserId()
    {
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(idClaim, out var id) ? id : null;
    }
}