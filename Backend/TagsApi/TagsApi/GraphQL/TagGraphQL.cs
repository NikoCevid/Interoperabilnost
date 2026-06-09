using System.Security.Claims;
using HotChocolate;
using HotChocolate.Authorization;
using HotChocolate.Types;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using TagsApi.Application.DTOs;
using TagsApi.Application.Interfaces;
using TagsApi.Domain.Enums;

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
        [Service] IExternalTagService externalTagService,
        [Service] IConfiguration config,
        string? search = null,
        int page = 1,
        int pageSize = 10)
    {
        if (config.GetValue<bool>("UseExternalApi"))
        {
            var spaceId = config["ClickUp:SpaceId"] ?? "";
            var all = await externalTagService.GetTagsFromExternalApiAsync(spaceId);
            var filtered = string.IsNullOrWhiteSpace(search)
                ? all
                : all.Where(t => t.Name.Contains(search, StringComparison.OrdinalIgnoreCase)).ToList();
            return new PagedResult<TagDto>
            {
                Items = filtered.Skip((page - 1) * pageSize).Take(pageSize).ToList(),
                TotalCount = filtered.Count,
                Page = page,
                PageSize = pageSize
            };
        }

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
        [Service] IExternalTagService externalTagService,
        [Service] IConfiguration config,
        Guid id)
    {
        if (config.GetValue<bool>("UseExternalApi"))
        {
            var spaceId = config["ClickUp:SpaceId"] ?? "";
            var all = await externalTagService.GetTagsFromExternalApiAsync(spaceId);
            return all.FirstOrDefault(t => t.Id == id);
        }

        return await tagService.GetByIdAsync(id);
    }

    [GraphQLDescription("Search tags by name")]
    public async Task<List<TagDto>> SearchTags(
        [Service] ITagService tagService,
        [Service] IExternalTagService externalTagService,
        [Service] IConfiguration config,
        string searchTerm)
    {
        if (config.GetValue<bool>("UseExternalApi"))
        {
            var spaceId = config["ClickUp:SpaceId"] ?? "";
            var all = await externalTagService.GetTagsFromExternalApiAsync(spaceId);
            return all
                .Where(t => t.Name.Contains(searchTerm, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        return await tagService.SearchAsync(searchTerm);
    }
}

public class Mutation
{
    [Authorize(Roles = new[] { UserRoles.FullAccess })]
    [GraphQLDescription("Create a new tag")]
    public async Task<TagDto> CreateTag(
        [Service] ITagService tagService,
        [Service] IExternalTagService externalTagService,
        [Service] IConfiguration config,
        [Service] IHttpContextAccessor httpContextAccessor,
        string name,
        string color,
        string? description = null)
    {
        var role = httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Role)?.Value;
        if (role != UserRoles.FullAccess)
            throw new GraphQLException(ErrorBuilder.New()
                .SetMessage("Unauthorized: FullAccess role required.")
                .SetCode("AUTH_NOT_AUTHORIZED")
                .Build());

        if (config.GetValue<bool>("UseExternalApi"))
        {
            var spaceId = config["ClickUp:SpaceId"] ?? "";
            return await externalTagService.CreateTagAsync(spaceId, name, color);
        }

        return await tagService.CreateAsync(new CreateTagDto
        {
            Name = name,
            Color = color,
            Description = description
        });
    }

    [Authorize(Roles = new[] { UserRoles.FullAccess })]
    [GraphQLDescription("Update an existing tag")]
    public async Task<TagDto?> UpdateTag(
        [Service] ITagService tagService,
        [Service] IExternalTagService externalTagService,
        [Service] IConfiguration config,
        [Service] IHttpContextAccessor httpContextAccessor,
        Guid id,
        string name,
        string color,
        string? description = null)
    {
        var role = httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Role)?.Value;
        if (role != UserRoles.FullAccess)
            throw new GraphQLException(ErrorBuilder.New()
                .SetMessage("Unauthorized: FullAccess role required.")
                .SetCode("AUTH_NOT_AUTHORIZED")
                .Build());

        if (config.GetValue<bool>("UseExternalApi"))
        {
            var spaceId = config["ClickUp:SpaceId"] ?? "";
            var all = await externalTagService.GetTagsFromExternalApiAsync(spaceId);
            var existing = all.FirstOrDefault(t => t.Id == id);
            if (existing is null) return null;
            return await externalTagService.UpdateTagAsync(spaceId, existing.Name, name, color);
        }

        return await tagService.UpdateAsync(id, new UpdateTagDto
        {
            Name = name,
            Color = color,
            Description = description
        });
    }

    [Authorize(Roles = new[] { UserRoles.FullAccess })]
    [GraphQLDescription("Delete a tag by ID")]
    public async Task<bool> DeleteTag(
        [Service] ITagService tagService,
        [Service] IExternalTagService externalTagService,
        [Service] IConfiguration config,
        [Service] IHttpContextAccessor httpContextAccessor,
        Guid id)
    {
        var role = httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Role)?.Value;
        if (role != UserRoles.FullAccess)
            throw new GraphQLException(ErrorBuilder.New()
                .SetMessage("Unauthorized: FullAccess role required.")
                .SetCode("AUTH_NOT_AUTHORIZED")
                .Build());

        if (config.GetValue<bool>("UseExternalApi"))
        {
            var spaceId = config["ClickUp:SpaceId"] ?? "";
            var all = await externalTagService.GetTagsFromExternalApiAsync(spaceId);
            var existing = all.FirstOrDefault(t => t.Id == id);
            if (existing is null) return false;
            return await externalTagService.DeleteTagAsync(spaceId, existing.Name);
        }

        return await tagService.DeleteAsync(id);
    }
}
