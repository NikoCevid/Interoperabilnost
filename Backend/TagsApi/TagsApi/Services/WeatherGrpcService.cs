using Grpc.Core;
using TagsApi.Application.Interfaces;



namespace TagsApi.Services;

public sealed class WeatherGrpcService : WeatherGrpc.WeatherGrpcBase
{
    private readonly IWeatherService _weatherService;
    private readonly ILogger<WeatherGrpcService> _logger;

    public WeatherGrpcService(
        IWeatherService weatherService,
        ILogger<WeatherGrpcService> logger)
    {
        _weatherService = weatherService;
        _logger = logger;
    }

    public override async Task<WeatherResponse> GetTemperature(
        WeatherRequest request,
        ServerCallContext context)
    {
        var response = new WeatherResponse();

        if (string.IsNullOrWhiteSpace(request.CityName))
        {
            response.ErrorMessage = "City name is required.";
            return response;
        }

        try
        {
            var results = await _weatherService.GetTemperatureByCity(
                request.CityName, context.CancellationToken);

            if (!results.Any())
            {
                response.ErrorMessage = $"No weather data found for: {request.CityName}";
                return response;
            }

            foreach (var r in results)
            {
                response.Entries.Add(new WeatherEntry
                {
                    City = r.City,
                    Temperature = r.Temperature,
                    Humidity = r.Humidity,
                    Wind = r.Wind
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "gRPC GetTemperature error for {City}", request.CityName);
            response.ErrorMessage = $"Error: {ex.Message}";
        }

        return response;
    }
}