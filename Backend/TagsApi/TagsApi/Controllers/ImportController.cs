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

    public ImportController(
        ITagService tagService,
        ImportValidationService importValidation)
    {
        _tagService = tagService;
        _importValidation = importValidation;
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

        if (isXml)
        {
            ImportValidationResult r = _importValidation.ParseAndValidateXml(body);
            if (!r.IsValid)
                return UnprocessableEntity(new
                { message = "XML validation failed", format = "XML", errors = r.Errors });

            var created = await _tagService.ImportAsync(r.Tags, userId, ct);
            return Ok(new { message = $"Successfully imported {created.Count} tag(s)", tags = created });
        }
        else
        {
            ImportValidationResult r = _importValidation.ParseAndValidateJson(body);
            if (!r.IsValid)
                return UnprocessableEntity(new
                { message = "JSON validation failed", format = "JSON", errors = r.Errors });

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