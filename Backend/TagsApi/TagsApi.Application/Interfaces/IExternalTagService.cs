using TagsApi.Application.DTOs;
namespace TagsApi.Application.Interfaces;
public interface IExternalTagService
{
    Task<List<TagDto>> GetTagsFromExternalApiAsync(string spaceId, CancellationToken ct = default);
}