using System.Text;
using System.Xml;
using System.Xml.Linq;
using System.Xml.Schema;
using System.Xml.XPath;
using TagsApi.Application.DTOs;
using TagsApi.Application.Interfaces;

namespace TagsApi.Infrastructure.Services;

public class XmlValidationService : IXmlValidationService
{
    public (bool IsValid, List<string> Errors) ValidateXml(string xmlContent, string xsdPath)
    {
        var errors = new List<string>();

        try
        {
            var schemas = new XmlSchemaSet();
            schemas.Add(null, xsdPath);

            var settings = new XmlReaderSettings
            {
                ValidationType = ValidationType.Schema,
                Schemas = schemas
            };
            settings.ValidationEventHandler += (_, e) =>
                errors.Add($"[{e.Severity}] Line {e.Exception?.LineNumber}, " +
                            $"Col {e.Exception?.LinePosition}: {e.Message}");

            using var reader = XmlReader.Create(new StringReader(xmlContent), settings);
            while (reader.Read()) { }
        }
        catch (XmlException ex)
        {
            errors.Add($"[Parse Error] Line {ex.LineNumber}: {ex.Message}");
        }
        catch (Exception ex)
        {
            errors.Add($"[Validation Error] {ex.Message}");
        }

        return (!errors.Any(), errors);
    }

    public string GenerateTagsXml(List<TagDto> tags)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.AppendLine("<Tags>");
        foreach (var tag in tags)
        {
            sb.AppendLine("  <Tag>");
            sb.AppendLine($"    <Name>{XmlEscape(tag.Name)}</Name>");
            sb.AppendLine($"    <Color>{XmlEscape(tag.Color)}</Color>");
            if (!string.IsNullOrEmpty(tag.Description))
                sb.AppendLine($"    <Description>{XmlEscape(tag.Description)}</Description>");
            sb.AppendLine("  </Tag>");
        }
        sb.AppendLine("</Tags>");
        return sb.ToString();
    }

    public List<TagDto> FilterTagsByXPath(string xmlContent, string searchTerm)
    {
        var results = new List<TagDto>();
        try
        {
            var doc = XDocument.Parse(xmlContent);
            var nav = doc.CreateNavigator()!;

            var safe = searchTerm.ToLower().Replace("'", "");
            var xpath = $"//Tag[contains(" +
                        $"translate(Name,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')," +
                        $"'{safe}')]";

            var nodes = nav.Select(xpath);
            while (nodes.MoveNext())
            {
                var n = nodes.Current;
                if (n == null) continue;

                results.Add(new TagDto
                {
                    Id = Guid.NewGuid(),
                    Name = n.SelectSingleNode("Name")?.Value ?? "",
                    Color = n.SelectSingleNode("Color")?.Value ?? "#000000",
                    Description = n.SelectSingleNode("Description")?.Value,
                    DateCreated = DateTime.UtcNow
                });
            }
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"XPath filtering failed: {ex.Message}");
        }
        return results;
    }

    private static string XmlEscape(string s) =>
        s.Replace("&", "&amp;")
         .Replace("<", "&lt;")
         .Replace(">", "&gt;")
         .Replace("\"", "&quot;")
         .Replace("'", "&apos;");
}