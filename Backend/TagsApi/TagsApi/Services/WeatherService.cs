using System.Xml.Linq;
using TagsApi.Application.DTOs;
using TagsApi.Application.Interfaces;

namespace TagsApi.Infrastructure.Services;

public class WeatherService : IWeatherService
{
    private readonly HttpClient _httpClient;

    public WeatherService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<List<WeatherDto>> GetTemperatureByCity(string cityName, CancellationToken ct = default)
    {
        try
        {
            var xml = await _httpClient.GetStringAsync(
                "https://vrijeme.hr/hrvatska_n.xml", ct);

            var doc = XDocument.Parse(xml);
            var ns = doc.Root?.GetDefaultNamespace() ?? XNamespace.None;

            var gradElements = doc.Descendants()
                .Where(e => e.Name.LocalName == "Grad")
                .ToList();

            var results = new List<WeatherDto>();

            foreach (var grad in gradElements)
            {
                var gradIme = grad.Element(ns + "GradIme")?.Value
                    ?? grad.Descendants().FirstOrDefault(e => e.Name.LocalName == "GradIme")?.Value
                    ?? "";

                if (!gradIme.Contains(cityName, StringComparison.OrdinalIgnoreCase))
                    continue;

                var podatci = grad.Descendants()
                    .FirstOrDefault(e => e.Name.LocalName == "Podatci");

                var temp = podatci?.Descendants()
                    .FirstOrDefault(e => e.Name.LocalName == "Temp")?.Value
                    ?? grad.Descendants().FirstOrDefault(e => e.Name.LocalName == "Temp")?.Value
                    ?? "N/A";

                var vlaga = podatci?.Descendants()
                    .FirstOrDefault(e => e.Name.LocalName == "Vlaga")?.Value
                    ?? grad.Descendants().FirstOrDefault(e => e.Name.LocalName == "Vlaga")?.Value
                    ?? "N/A";

                var vjetar = podatci?.Descendants()
                    .FirstOrDefault(e => e.Name.LocalName == "VjetarBrzina")?.Value
                    ?? grad.Descendants().FirstOrDefault(e => e.Name.LocalName == "VjetarBrzina")?.Value
                    ?? "N/A";

                results.Add(new WeatherDto
                {
                    City = gradIme,
                    Temperature = temp,
                    Humidity = vlaga,
                    Wind = vjetar
                });
            }

            return results;
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to fetch weather data: {ex.Message}");
        }
    }
}