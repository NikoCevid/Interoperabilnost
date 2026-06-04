namespace TagsApi.Application.DTOs;
public class WeatherDto
{
    public string City { get; set; } = string.Empty;
    public string Temperature { get; set; } = string.Empty;
    public string Humidity { get; set; } = string.Empty;
    public string Wind { get; set; } = string.Empty;
}