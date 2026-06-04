using CoreWCF;
using Microsoft.AspNetCore.Hosting;
using TagsApi.Application.Interfaces;



namespace TagsApi.Soap;

[ServiceContract(Namespace = "http://tagsapi.com/soap")]
public interface ITagSoapService
{
    [OperationContract]
    Task<SoapTagSearchResponse> SearchTags(string searchTerm);
}

public sealed class TagSoapService : ITagSoapService
{
    private readonly ITagService _tagService;
    private readonly IXmlValidationService _xmlValidation;
    private readonly ILogger<TagSoapService> _logger;
    private readonly string _xsdPath;

    public TagSoapService(
        ITagService tagService,
        IXmlValidationService xmlValidation,
        ILogger<TagSoapService> logger,
        IWebHostEnvironment env)
    {
        _tagService = tagService;
        _xmlValidation = xmlValidation;
        _logger = logger;
        _xsdPath = SysPath.Combine(env.ContentRootPath, "Schemas", "tags.xsd");
    }

    public async Task<SoapTagSearchResponse> SearchTags(string searchTerm)
    {
        try
        {
            var tags = await _tagService.SearchAsync(searchTerm);

            var xml = _xmlValidation.GenerateTagsXml(tags);

            var (isValid, validationErrors) = _xmlValidation.ValidateXml(xml, _xsdPath);
            if (!isValid)
                _logger.LogWarning("Generated XML failed XSD validation: {E}",
                    string.Join("; ", validationErrors));

            var filtered = _xmlValidation.FilterTagsByXPath(xml, searchTerm);

            return new SoapTagSearchResponse
            {
                Tags = filtered.Select(t => new SoapTagDto
                {
                    Id = t.Id.ToString(),
                    Name = t.Name,
                    Color = t.Color,
                    Description = t.Description ?? "",
                    DateCreated = t.DateCreated.ToString("yyyy-MM-dd HH:mm:ss")
                }).ToList(),
                SearchTerm = searchTerm,
                TotalFound = filtered.Count,
                XmlValid = isValid,
                ValidationErrors = validationErrors
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SOAP SearchTags failed for: {Term}", searchTerm);
            return new SoapTagSearchResponse
            {
                Tags = new List<SoapTagDto>(),
                SearchTerm = searchTerm,
                TotalFound = 0,
                XmlValid = false,
                ValidationErrors = new List<string> { ex.Message }
            };
        }
    }
}

public sealed class SoapTagSearchResponse
{
    public List<SoapTagDto> Tags { get; set; } = new();
    public string SearchTerm { get; set; } = "";
    public int TotalFound { get; set; }
    public bool XmlValid { get; set; }
    public List<string> ValidationErrors { get; set; } = new();
}

public sealed class SoapTagDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Color { get; set; } = "";
    public string Description { get; set; } = "";
    public string DateCreated { get; set; } = "";
}