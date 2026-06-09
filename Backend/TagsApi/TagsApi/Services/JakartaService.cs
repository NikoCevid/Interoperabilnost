using TagsApi.Application.DTOs;
using TagsApi.Application.Interfaces;

namespace TagsApi.Services;

public class JakartaService(
    ITagService tagService,
    IExternalTagService externalTagService,
    IXmlValidationService xmlValidationService,
    IWebHostEnvironment env,
    IConfiguration config)
{
    public async Task<List<JakartaTagValidationResult>> ValidateTagsFromDatabaseAsync()
    {
        List<TagDto> items;
        if (config.GetValue<bool>("UseExternalApi"))
        {
            var spaceId = config["ClickUp:SpaceId"] ?? "";
            items = await externalTagService.GetTagsFromExternalApiAsync(spaceId);
        }
        else
        {
            var pagedResult = await tagService.GetAllAsync(new TagQueryDto { PageSize = 10_000 });
            items = pagedResult.Items;
        }

        var xml = xmlValidationService.GenerateTagsXml(items);
        var xsdPath = SysPath.Combine(env.ContentRootPath, "Schemas", "tags.xsd");
        return xmlValidationService.ValidateTagsPerRecord(xml, xsdPath);
    }
}
