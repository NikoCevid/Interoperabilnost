using Microsoft.AspNetCore.Mvc;
using TagsApi.Services;

namespace TagsApi.Controllers;

[ApiController]
[Route("api/jakarta")]
public class JakartaController(JakartaService jakartaService) : ControllerBase
{
    [HttpGet("validate")]
    public async Task<IActionResult> Validate()
    {
        var results = await jakartaService.ValidateTagsFromDatabaseAsync();
        return Ok(results);
    }
}
