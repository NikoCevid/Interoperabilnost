using HotChocolate;
using HotChocolate.Types;
using TagsApi.Application.DTOs;
using TagsApi.Application.Interfaces;

namespace TagsApi.GraphQL;

public class TagGraphType : ObjectType<TagDto>
{
    protected override void Configure(IObjectTypeDescriptor<TagDto> descriptor)
    {
        descriptor.Description("Represents a tag entity.");
        descriptor.Field(t => t.Id).Description("Unique identifier of the tag.");
        descriptor.Field(t => t.Name).Description("Name of the tag.");
        descriptor.Field(t => t.Color).Description("Hex color code of the tag.");
        descriptor.Field(t => t.Description).Description("Optional description.");
        descriptor.Field(t => t.DateCreated).Description("Creation date.");
    }
}

public class Query
{
    [GraphQLDescription("Get all tags with optional filtering")]
    public async Task<PagedResult<TagDto>> GetTags(
        [Service] ITagService tagService,
        string? search = null,
        int page = 1,
        int pageSize = 10)
    {
        return await tagService.GetAllAsync(new TagQueryDto
        {
            Search = search,
            Page = page,
            PageSize = pageSize
        });
    }

    [GraphQLDescription("Get a single tag by ID")]
    public async Task<TagDto?> GetTag(
        [Service] ITagService tagService,
        Guid id)
    {
        return await tagService.GetByIdAsync(id);
    }

    [GraphQLDescription("Search tags by name")]
    public async Task<List<TagDto>> SearchTags(
        [Service] ITagService tagService,
        string searchTerm)
    {
        return await tagService.SearchAsync(searchTerm);
    }
}

public class Mutation
{
    [GraphQLDescription("Create a new tag")]
    public async Task<TagDto> CreateTag(
        [Service] ITagService tagService,
        string name,
        string color,
        string? description = null)
    {
        return await tagService.CreateAsync(new CreateTagDto
        {
            Name = name,
            Color = color,
            Description = description
        });
    }

    [GraphQLDescription("Update an existing tag")]
    public async Task<TagDto?> UpdateTag(
        [Service] ITagService tagService,
        Guid id,
        string name,
        string color,
        string? description = null)
    {
        return await tagService.UpdateAsync(id, new UpdateTagDto
        {
            Name = name,
            Color = color,
            Description = description
        });
    }

    [GraphQLDescription("Delete a tag by ID")]
    public async Task<bool> DeleteTag(
        [Service] ITagService tagService,
        Guid id)
    {
        return await tagService.DeleteAsync(id);
    }
}