using Microsoft.EntityFrameworkCore;
using TagsApi.Application.DTOs;
using TagsApi.Application.Interfaces;
using TagsApi.Domain.Entities;
using TagsApi.Infrastructure.Data;

namespace TagsApi.Infrastructure.Repositories;

public class TagRepository : ITagRepository
{
    private readonly AppDbContext _db;

    public TagRepository(AppDbContext db) => _db = db;

    public async Task<PagedResult<Tag>> GetAllAsync(TagQueryDto query, CancellationToken ct = default)
    {
        var q = _db.Tags.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Search))
            q = q.Where(t => t.Name.ToLower().Contains(query.Search.ToLower()) ||
                              (t.Description != null && t.Description.ToLower().Contains(query.Search.ToLower())));

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(t => t.DateCreated)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(ct);

        return new PagedResult<Tag>
        {
            Items = items,
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<Tag?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.Tags.FirstOrDefaultAsync(t => t.Id == id, ct);

    public async Task<Tag> CreateAsync(Tag tag, CancellationToken ct = default)
    {
        _db.Tags.Add(tag);
        await _db.SaveChangesAsync(ct);
        return tag;
    }

    public async Task<Tag> UpdateAsync(Tag tag, CancellationToken ct = default)
    {
        _db.Tags.Update(tag);
        await _db.SaveChangesAsync(ct);
        return tag;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var tag = await _db.Tags.FindAsync(new object[] { id }, ct);
        if (tag == null) return false;
        tag.IsDeleted = true;
        tag.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<List<Tag>> SearchAsync(string searchTerm, CancellationToken ct = default)
        => await _db.Tags
            .Where(t => t.Name.ToLower().Contains(searchTerm.ToLower()))
            .OrderBy(t => t.Name)
            .ToListAsync(ct);

    public async Task<List<Tag>> CreateManyAsync(List<Tag> tags, CancellationToken ct = default)
    {
        _db.Tags.AddRange(tags);
        await _db.SaveChangesAsync(ct);
        return tags;
    }

    public async Task<bool> ExistsAsync(Guid id, CancellationToken ct = default)
        => await _db.Tags.AnyAsync(t => t.Id == id, ct);
}