using Microsoft.AspNetCore.Mvc;

namespace TagsApi.Controllers;

[ApiController]
[Route("api/config")]
public class ConfigController(IConfiguration config) : ControllerBase
{
    [HttpGet("mode")]
    public IActionResult GetMode()
    {
        var useExternal = config.GetValue<bool>("UseExternalApi");
        return Ok(new
        {
            useExternalApi = useExternal,
            mode = useExternal ? "ClickUp Public API" : "Local Database"
        });
    }
}
