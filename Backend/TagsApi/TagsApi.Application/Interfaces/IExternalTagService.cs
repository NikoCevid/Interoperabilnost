using TagsApi.Application.DTOs;
namespace TagsApi.Application.Interfaces;
public interface IExternalTagService
{
    Task<List<TagDto>> GetTagsFromExternalApiAsync(string spaceId, CancellationToken ct = default);
    Task<TagDto> CreateTagAsync(string spaceId, string name, string color, CancellationToken ct = default);
    Task<TagDto?> UpdateTagAsync(string spaceId, string tagName, string newName, string newColor, CancellationToken ct = default);
    Task<bool> DeleteTagAsync(string spaceId, string tagName, CancellationToken ct = default);
}