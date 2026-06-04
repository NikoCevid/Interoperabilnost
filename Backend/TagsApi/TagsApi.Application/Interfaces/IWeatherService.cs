using TagsApi.Application.DTOs;
namespace TagsApi.Application.Interfaces;
public interface IWeatherService
{
    Task<List<WeatherDto>> GetTemperatureByCity(string cityName, CancellationToken ct = default);
}