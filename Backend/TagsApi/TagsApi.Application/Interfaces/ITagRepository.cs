using TagsApi.Application.DTOs;
using TagsApi.Domain.Entities;

namespace TagsApi.Application.Interfaces;

public interface ITagRepository
{
    Task<PagedResult<Tag>> GetAllAsync(TagQueryDto query, CancellationToken ct = default);
    Task<Tag?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Tag> CreateAsync(Tag tag, CancellationToken ct = default);
    Task<Tag> UpdateAsync(Tag tag, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
    Task<List<Tag>> SearchAsync(string searchTerm, CancellationToken ct = default);
    Task<List<Tag>> CreateManyAsync(List<Tag> tags, CancellationToken ct = default);
    Task<bool> ExistsAsync(Guid id, CancellationToken ct = default);
}