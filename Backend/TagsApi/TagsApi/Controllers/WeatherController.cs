using Microsoft.AspNetCore.Mvc;
using TagsApi.Application.Interfaces;

namespace TagsApi.Controllers;


[ApiController]
[Route("api/[controller]")]
public class WeatherController : ControllerBase
{
    private readonly IWeatherService _weatherService;
    private readonly ILogger<WeatherController> _logger;

    public WeatherController(
        IWeatherService weatherService,
        ILogger<WeatherController> logger)
    {
        _weatherService = weatherService;
        _logger = logger;
    }

    [HttpGet("{cityName}")]
    public async Task<IActionResult> GetWeather(string cityName, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(cityName))
            return BadRequest(new { message = "City name is required" });

        try
        {
            var results = await _weatherService.GetTemperatureByCity(cityName, ct);

            if (!results.Any())
                return NotFound(new { message = $"No weather data found for: {cityName}" });

            return Ok(new
            {
                cityName,
                results = results.Select(r => new
                {
                    city = r.City,
                    temperature = r.Temperature,
                    humidity = r.Humidity,
                    wind = r.Wind
                })
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Weather fetch failed for {City}", cityName);
            return StatusCode(503, new { message = $"Weather service unavailable: {ex.Message}" });
        }
    }
}