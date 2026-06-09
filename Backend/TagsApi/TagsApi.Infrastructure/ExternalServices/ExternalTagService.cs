using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using TagsApi.Application.DTOs;
using TagsApi.Application.Interfaces;

namespace TagsApi.Infrastructure.Services;

public class ExternalTagService : IExternalTagService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<ExternalTagService> _logger;

    public ExternalTagService(HttpClient httpClient, IConfiguration config, ILogger<ExternalTagService> logger)
    {
        _httpClient = httpClient;
        _config = config;
        _logger = logger;
    }

    private static Guid TagNameToGuid(string name) =>
        new(MD5.HashData(Encoding.UTF8.GetBytes(name)));

    private void SetAuth()
    {
        var apiKey = _config["ClickUp:ApiKey"] ?? "";
        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Add("Authorization", apiKey);
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    private static StringContent JsonBody(object payload) =>
        new(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

    public async Task<List<TagDto>> GetTagsFromExternalApiAsync(string spaceId, CancellationToken ct = default)
    {
        SetAuth();
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
                Id = TagNameToGuid(t.Name ?? ""),
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

    public async Task<TagDto> CreateTagAsync(string spaceId, string name, string color, CancellationToken ct = default)
    {
        SetAuth();

        var payload = new { tag = new { name, tag_fg = color, tag_bg = color } };
        var bodyJson = JsonSerializer.Serialize(payload);
        var body = new StringContent(bodyJson, Encoding.UTF8, "application/json");

        var url = $"https://api.clickup.com/api/v2/space/{spaceId}/tag";
        var apiKeyLength = (_config["ClickUp:ApiKey"] ?? "").Length;

        _logger.LogInformation("CreateTagAsync REQUEST: url={Url} apiKeyLength={ApiKeyLength} body={Body}",
            url, apiKeyLength, bodyJson);

        var response = await _httpClient.PostAsync(url, body, ct);

        var responseBody = await response.Content.ReadAsStringAsync(ct);
        var responseHeaders = string.Join("; ", response.Headers.Select(h => $"{h.Key}=[{string.Join(",", h.Value)}]"));

        _logger.LogInformation(
            "CreateTagAsync RESPONSE: status={Status} headers={Headers} body={Body}",
            (int)response.StatusCode, responseHeaders, responseBody);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("CreateTagAsync failed: status={Status}, response={Response}",
                (int)response.StatusCode, responseBody);
            throw new InvalidOperationException($"ClickUp API returned {(int)response.StatusCode}: {responseBody}");
        }

        return new TagDto
        {
            Id = TagNameToGuid(name),
            Name = name,
            Color = color,
            DateCreated = DateTime.UtcNow
        };
    }

    public async Task<TagDto?> UpdateTagAsync(string spaceId, string tagName, string newName, string newColor, CancellationToken ct = default)
    {
        SetAuth();
        var encoded = Uri.EscapeDataString(tagName);
        var url = $"https://api.clickup.com/api/v2/space/{spaceId}/tag/{encoded}";
        var payload = new { tag = new { name = newName, tag_fg = newColor, tag_bg = newColor } };
        var body = JsonBody(payload);
        _logger.LogInformation("UpdateTagAsync PUT {Url} body={Body}", url, JsonSerializer.Serialize(payload));
        var response = await _httpClient.PutAsync(url, body, ct);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            _logger.LogWarning("UpdateTagAsync failed: status={Status}, response={Response}",
                (int)response.StatusCode, errorBody);
            return null;
        }

        return new TagDto
        {
            Id = TagNameToGuid(newName),
            Name = newName,
            Color = newColor,
            DateCreated = DateTime.UtcNow
        };
    }

    public async Task<bool> DeleteTagAsync(string spaceId, string tagName, CancellationToken ct = default)
    {
        SetAuth();
        var encoded = Uri.EscapeDataString(tagName);
        var response = await _httpClient.DeleteAsync(
            $"https://api.clickup.com/api/v2/space/{spaceId}/tag/{encoded}", ct);
        return response.IsSuccessStatusCode;
    }
}

public class ClickUpTagResponse
{
    public List<ClickUpTag>? Tags { get; set; }
}

public class ClickUpTag
{
    public string? Name { get; set; }
    [JsonPropertyName("tag_fg")] public string? TagFg { get; set; }
    [JsonPropertyName("tag_bg")] public string? TagBg { get; set; }
}
