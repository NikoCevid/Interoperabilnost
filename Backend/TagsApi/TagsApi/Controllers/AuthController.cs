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

    private static CookieOptions RefreshCookieOptions => new()
    {
        HttpOnly = true,
        Secure = false,
        SameSite = SameSiteMode.Strict,
        MaxAge = TimeSpan.FromDays(7)
    };

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto, CancellationToken ct)
    {
        try
        {
            var result = await _authService.LoginAsync(dto, ct);
            Response.Cookies.Append("refreshToken", result.RefreshToken, RefreshCookieOptions);
            return Ok(new { result.AccessToken, result.AccessTokenExpiry, result.User });
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
    [AllowAnonymous]
    public async Task<IActionResult> Refresh()
    {
        var refreshToken = Request.Cookies["refreshToken"];

        if (string.IsNullOrEmpty(refreshToken))
            return Unauthorized(new { message = "No refresh token provided." });

        try
        {
            var result = await _authService.RefreshTokenAsync(refreshToken, HttpContext.RequestAborted);

            Response.Cookies.Append("refreshToken", result.RefreshToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = false,
                SameSite = SameSiteMode.Strict,
                MaxAge = TimeSpan.FromDays(7)
            });

            return Ok(new { accessToken = result.AccessToken, accessTokenExpiry = result.AccessTokenExpiry });
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(new { message = "Invalid or expired refresh token." });
        }
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var refreshToken = Request.Cookies["refreshToken"];
        if (!string.IsNullOrEmpty(refreshToken))
        {
            try { await _authService.RevokeTokenAsync(refreshToken, ct); } catch { }
        }
        Response.Cookies.Delete("refreshToken");
        Response.Cookies.Delete("refresh_token");
        return NoContent();
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