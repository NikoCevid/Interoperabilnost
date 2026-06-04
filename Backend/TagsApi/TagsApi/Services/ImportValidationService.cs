using System.Text.Json;
using System.Xml.Linq;
using Json.Schema;
using TagsApi.Application.DTOs;
using TagsApi.Application.Interfaces;

namespace TagsApi.Services;

public sealed class ImportValidationResult
{
    public bool IsValid { get; init; }
    public List<string> Errors { get; init; } = new();
    public List<ImportTagDto> Tags { get; init; } = new();
}

public sealed class ImportValidationService
{
    private readonly IXmlValidationService _xmlValidation;
    private readonly string _xsdPath;
    private readonly string _jsonSchemaPath;

    public ImportValidationService(
        IXmlValidationService xmlValidation,
        string xsdPath,
        string jsonSchemaPath)
    {
        _xmlValidation = xmlValidation;
        _xsdPath = xsdPath;
        _jsonSchemaPath = jsonSchemaPath;
    }

    public ImportValidationResult ParseAndValidateXml(string xmlContent)
    {
        var errors = new List<string>();
        var tags = new List<ImportTagDto>();

        var (isValid, xsdErrors) = _xmlValidation.ValidateXml(xmlContent, _xsdPath);
        if (!isValid)
            return new ImportValidationResult { IsValid = false, Errors = xsdErrors };

        try
        {
            var doc = XDocument.Parse(xmlContent);
            foreach (var el in doc.Descendants("Tag"))
            {
                var name = el.Element("Name")?.Value;
                var color = el.Element("Color")?.Value;
                var desc = el.Element("Description")?.Value;

                if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(color))
                {
                    errors.Add("Each <Tag> must contain <n> and <Color> elements.");
                    continue;
                }
                tags.Add(new ImportTagDto { Name = name, Color = color, Description = desc });
            }
            if (!tags.Any())
                errors.Add("No valid <Tag> elements found in the XML.");
        }
        catch (Exception ex) { errors.Add($"XML parse error: {ex.Message}"); }

        return new ImportValidationResult
        { IsValid = !errors.Any(), Errors = errors, Tags = tags };
    }

    public ImportValidationResult ParseAndValidateJson(string jsonContent)
    {
        var errors = new List<string>();
        var tags = new List<ImportTagDto>();

        try
        {
            var schemaText = File.ReadAllText(_jsonSchemaPath);
            var schema = JsonSchema.FromText(schemaText);
            var jsonDoc = JsonDocument.Parse(jsonContent);

            
            var evalResult = schema.Evaluate(jsonDoc.RootElement);

            if (!evalResult.IsValid)
            {
                CollectErrors(evalResult, errors);
                if (!errors.Any())
                    errors.Add("JSON does not match the required schema.");
                return new ImportValidationResult { IsValid = false, Errors = errors };
            }

            if (jsonDoc.RootElement.ValueKind == JsonValueKind.Array)
                foreach (var item in jsonDoc.RootElement.EnumerateArray())
                    tags.Add(ParseTagFromJson(item));
            else
                tags.Add(ParseTagFromJson(jsonDoc.RootElement));

            if (!tags.Any())
                errors.Add("No valid tags found in JSON.");
        }
        catch (JsonException ex) { errors.Add($"Invalid JSON: {ex.Message}"); }
        catch (Exception ex) { errors.Add($"Validation error: {ex.Message}"); }

        return new ImportValidationResult
        { IsValid = !errors.Any(), Errors = errors, Tags = tags };
    }

    private static void CollectErrors(EvaluationResults result, List<string> errors)
    {
        if (result.Errors != null)
            foreach (var kvp in result.Errors)
                errors.Add($"[{result.InstanceLocation}] {kvp.Key}: {kvp.Value}");

        if (result.Details != null)
            foreach (var child in result.Details)
                CollectErrors(child, errors);
    }

    private static ImportTagDto ParseTagFromJson(JsonElement el) => new()
    {
        Name = el.GetProperty("name").GetString() ?? "",
        Color = el.GetProperty("color").GetString() ?? "",
        Description = el.TryGetProperty("description", out var d) ? d.GetString() : null
    };
}