using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TagsApi.Application.Interfaces;
using TagsApi.Domain.Enums;
using TagsApi.Infrastructure.Services;
using TagsApi.Services;

namespace TagsApi.Controllers;

[ApiController]
[Route("api/tags")]
[Authorize(Roles = UserRoles.FullAccess)]
public class ImportController : ControllerBase
{
    private readonly ITagService _tagService;
    private readonly ImportValidationService _importValidation;
    private readonly IExternalTagService _externalTagService;
    private readonly IConfiguration _config;

    public ImportController(
        ITagService tagService,
        ImportValidationService importValidation,
        IExternalTagService externalTagService,
        IConfiguration config)
    {
        _tagService = tagService;
        _importValidation = importValidation;
        _externalTagService = externalTagService;
        _config = config;
    }


    [HttpPost("import")]
    [Consumes("application/json", "application/xml", "text/xml")]
    public async Task<IActionResult> Import(CancellationToken ct)
    {
        var contentType = Request.ContentType ?? "";
        string body;

        using (var reader = new StreamReader(Request.Body))
            body = await reader.ReadToEndAsync(ct);

        if (string.IsNullOrWhiteSpace(body))
            return BadRequest(new { message = "Request body is empty" });

        bool isXml = contentType.Contains("xml")
                      || body.TrimStart().StartsWith("<");
        bool isJson = contentType.Contains("json")
                      || body.TrimStart().StartsWith("{")
                      || body.TrimStart().StartsWith("[");

        if (!isXml && !isJson)
            return BadRequest(new
            {
                message = "Unsupported content type. Use application/xml or application/json"
            });

        var userId = GetCurrentUserId();

        ImportValidationResult r;
        if (isXml)
        {
            r = _importValidation.ParseAndValidateXml(body);
            if (!r.IsValid)
                return UnprocessableEntity(new
                { message = "XML validation failed", format = "XML", errors = r.Errors });
        }
        else
        {
            r = _importValidation.ParseAndValidateJson(body);
            if (!r.IsValid)
                return UnprocessableEntity(new
                { message = "JSON validation failed", format = "JSON", errors = r.Errors });
        }

        bool useExternal = _config.GetValue<bool>("UseExternalApi");

        if (useExternal)
        {
            var spaceId = _config["ClickUp:SpaceId"] ?? "";
            var results = new List<object>();
            var errors = new List<object>();

            foreach (var tag in r.Tags)
            {
                try
                {
                    var created = await _externalTagService.CreateTagAsync(spaceId, tag.Name, tag.Color, ct);
                    results.Add(created);
                }
                catch (Exception ex)
                {
                    errors.Add(new { tag = tag.Name, error = ex.Message });
                }
            }

            return Ok(new
            {
                message = $"Successfully imported {results.Count} tag(s) via external API",
                tags = results,
                errors
            });
        }
        else
        {
            var created = await _tagService.ImportAsync(r.Tags, userId, ct);
            return Ok(new { message = $"Successfully imported {created.Count} tag(s)", tags = created });
        }
    }

    private Guid? GetCurrentUserId()
    {
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(idClaim, out var id) ? id : null;
    }
}