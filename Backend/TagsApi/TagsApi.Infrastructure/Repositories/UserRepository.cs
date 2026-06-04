using Microsoft.EntityFrameworkCore;
using TagsApi.Application.Interfaces;
using TagsApi.Domain.Entities;
using TagsApi.Infrastructure.Data;

namespace TagsApi.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _db;

    public UserRepository(AppDbContext db) => _db = db;

    public async Task<User?> GetByUsernameAsync(string username, CancellationToken ct = default)
        => await _db.Users.FirstOrDefaultAsync(u => u.Username == username, ct);

    public async Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.Users.FindAsync(new object[] { id }, ct);

    public async Task<User> CreateAsync(User user, CancellationToken ct = default)
    {
        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);
        return user;
    }

    public async Task<bool> UsernameExistsAsync(string username, CancellationToken ct = default)
        => await _db.Users.AnyAsync(u => u.Username == username, ct);

    public async Task<bool> EmailExistsAsync(string email, CancellationToken ct = default)
        => await _db.Users.AnyAsync(u => u.Email == email, ct);

    public async Task<RefreshToken?> GetRefreshTokenAsync(string token, CancellationToken ct = default)
        => await _db.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == token, ct);

    public async Task SaveRefreshTokenAsync(RefreshToken token, CancellationToken ct = default)
    {
        _db.RefreshTokens.Add(token);
        await _db.SaveChangesAsync(ct);
    }

    public async Task RevokeRefreshTokenAsync(string token, CancellationToken ct = default)
    {
        var t = await _db.RefreshTokens.FirstOrDefaultAsync(r => r.Token == token, ct);
        if (t != null)
        {
            t.IsRevoked = true;
            await _db.SaveChangesAsync(ct);
        }
    }
}