using TagsApi.Application.DTOs;

namespace TagsApi.Application.Interfaces;

public interface ITagService
{
    Task<PagedResult<TagDto>> GetAllAsync(TagQueryDto query, CancellationToken ct = default);
    Task<TagDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<TagDto> CreateAsync(CreateTagDto dto, Guid? userId = null, CancellationToken ct = default);
    Task<TagDto?> UpdateAsync(Guid id, UpdateTagDto dto, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
    Task<List<TagDto>> ImportAsync(List<ImportTagDto> tags, Guid? userId = null, CancellationToken ct = default);
    Task<List<TagDto>> SearchAsync(string searchTerm, CancellationToken ct = default);
}