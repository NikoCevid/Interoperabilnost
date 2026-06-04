using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TagsApi.Application.DTOs;
using TagsApi.Application.Interfaces;

namespace TagsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService) => _authService = authService;

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto, CancellationToken ct)
    {
        try
        {
            var result = await _authService.LoginAsync(dto, ct);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        try
        {
            var result = await _authService.RegisterAsync(dto, ct);
            return CreatedAtAction(nameof(Login), result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenDto dto, CancellationToken ct)
    {
        try
        {
            var result = await _authService.RefreshTokenAsync(dto.RefreshToken, ct);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("revoke")]
    [Authorize]
    public async Task<IActionResult> Revoke([FromBody] RefreshTokenDto dto, CancellationToken ct)
    {
        await _authService.RevokeTokenAsync(dto.RefreshToken, ct);
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public IActionResult Me()
    {
        var user = new UserInfoDto
        {
            Id = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString()),
            Username = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? "",
            Email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? "",
            Role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? ""
        };
        return Ok(user);
    }
}