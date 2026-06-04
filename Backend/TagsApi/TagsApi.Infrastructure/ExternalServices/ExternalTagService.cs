using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using TagsApi.Application.DTOs;
using TagsApi.Application.Interfaces;

namespace TagsApi.Infrastructure.Services;

public class ExternalTagService : IExternalTagService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;

    public ExternalTagService(HttpClient httpClient, IConfiguration config)
    {
        _httpClient = httpClient;
        _config = config;
    }

    public async Task<List<TagDto>> GetTagsFromExternalApiAsync(string spaceId, CancellationToken ct = default)
    {
        var apiKey = _config["ClickUp:ApiKey"] ?? "";
        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Add("Authorization", apiKey);

        try
        {
            var response = await _httpClient.GetAsync(
                $"https://api.clickup.com/api/v2/space/{spaceId}/tag", ct);

            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync(ct);
            var result = JsonSerializer.Deserialize<ClickUpTagResponse>(json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return result?.Tags?.Select(t => new TagDto
            {
                Id = Guid.NewGuid(),
                Name = t.Name ?? "Unknown",
                Color = t.TagBg ?? "#000000",
                DateCreated = DateTime.UtcNow
            }).ToList() ?? new List<TagDto>();
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to fetch from ClickUp API: {ex.Message}");
        }
    }
}

public class ClickUpTagResponse
{
    public List<ClickUpTag>? Tags { get; set; }
}

public class ClickUpTag
{
    public string? Name { get; set; }
    public string? TagFg { get; set; }
    public string? TagBg { get; set; }
}