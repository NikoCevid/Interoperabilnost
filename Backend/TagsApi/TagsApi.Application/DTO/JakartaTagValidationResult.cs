namespace TagsApi.Application.DTOs;

public class JakartaTagValidationResult
{
    public string TagName { get; set; } = string.Empty;
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
}
