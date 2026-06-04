using Microsoft.AspNetCore.Mvc;
using TagsApi.Soap;

namespace TagsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SoapController : ControllerBase
{
    private readonly ITagSoapService _soapService;

    public SoapController(ITagSoapService soapService) => _soapService = soapService;

    [HttpPost("search")]
    public async Task<IActionResult> Search( [FromBody] SoapSearchRequest request,CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.SearchTerm))
            return BadRequest(new { message = "SearchTerm is required" });

        var result = await _soapService.SearchTags(request.SearchTerm);
        return Ok(result);
    }
}

public sealed class SoapSearchRequest
{
    public string SearchTerm { get; set; } = string.Empty;
}