using TagsApi.Application.DTOs;
using TagsApi.Application.Interfaces;
using TagsApi.Domain.Entities;

using DomainTag = TagsApi.Domain.Entities.Tag;

namespace TagsApi.Application.Services;

public class TagService : ITagService
{
    private readonly ITagRepository _tagRepository;

    public TagService(ITagRepository tagRepository)
    {
        _tagRepository = tagRepository;
    }

    public async Task<PagedResult<TagDto>> GetAllAsync(TagQueryDto query, CancellationToken ct = default)
    {
        var result = await _tagRepository.GetAllAsync(query, ct);
        return new PagedResult<TagDto>
        {
            Items = result.Items.Select(MapToDto).ToList(),
            TotalCount = result.TotalCount,
            Page = result.Page,
            PageSize = result.PageSize
        };
    }

    public async Task<TagDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var tag = await _tagRepository.GetByIdAsync(id, ct);
        return tag == null ? null : MapToDto(tag);
    }

    public async Task<TagDto> CreateAsync(CreateTagDto dto, Guid? userId = null, CancellationToken ct = default)
    {
        var tag = new DomainTag
        {
            Name = dto.Name,
            Color = dto.Color,
            Description = dto.Description,
            CreatedBy = userId,
            DateCreated = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var created = await _tagRepository.CreateAsync(tag, ct);
        return MapToDto(created);
    }

    public async Task<TagDto?> UpdateAsync(Guid id, UpdateTagDto dto, CancellationToken ct = default)
    {
        var existing = await _tagRepository.GetByIdAsync(id, ct);
        if (existing == null) return null;

        existing.Name = dto.Name;
        existing.Color = dto.Color;
        existing.Description = dto.Description;
        existing.UpdatedAt = DateTime.UtcNow;

        var updated = await _tagRepository.UpdateAsync(existing, ct);
        return MapToDto(updated);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        => await _tagRepository.DeleteAsync(id, ct);

    public async Task<List<TagDto>> ImportAsync(
        List<ImportTagDto> tags, Guid? userId = null, CancellationToken ct = default)
    {
        var entities = tags.Select(t => new DomainTag
        {
            Name = t.Name,
            Color = t.Color,
            Description = t.Description,
            CreatedBy = userId,
            DateCreated = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        }).ToList();

        var created = await _tagRepository.CreateManyAsync(entities, ct);
        return created.Select(MapToDto).ToList();
    }

    public async Task<List<TagDto>> SearchAsync(string searchTerm, CancellationToken ct = default)
    {
        var tags = await _tagRepository.SearchAsync(searchTerm, ct);
        return tags.Select(MapToDto).ToList();
    }

    private static TagDto MapToDto(DomainTag tag) => new()
    {
        Id = tag.Id,
        Name = tag.Name,
        Color = tag.Color,
        Description = tag.Description,
        DateCreated = tag.DateCreated
    };
}