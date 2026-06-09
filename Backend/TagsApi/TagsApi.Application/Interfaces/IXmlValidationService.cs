using TagsApi.Application.DTOs;
namespace TagsApi.Application.Interfaces;
public interface IXmlValidationService
{
    (bool IsValid, List<string> Errors) ValidateXml(string xmlContent, string xsdPath);
    string GenerateTagsXml(List<TagDto> tags);
    List<TagDto> FilterTagsByXPath(string xmlContent, string searchTerm);
    List<JakartaTagValidationResult> ValidateTagsPerRecord(string xmlContent, string xsdPath);
}