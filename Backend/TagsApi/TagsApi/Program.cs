using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using CoreWCF;
using CoreWCF.Configuration;
using CoreWCF.Description;
using TagsApi.Application.Interfaces;
using TagsApi.Application.Services;
using TagsApi.GraphQL;
using TagsApi.Infrastructure.Data;
using TagsApi.Infrastructure.Repositories;
using TagsApi.Infrastructure.Services;
using TagsApi.Services;
using TagsApi.Soap;


var builder = WebApplication.CreateBuilder(args);

// ─── Baza ─────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ─── Repositories ─────────────────────────────────────────────────────────────
builder.Services.AddScoped<ITagRepository, TagRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();

// ─── Application Services ─────────────────────────────────────────────────────
builder.Services.AddScoped<ITagService, TagService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IXmlValidationService, XmlValidationService>();
builder.Services.AddScoped<ITagSoapService, TagSoapService>();

// ─── HTTP Clients ─────────────────────────────────────────────────────────────
builder.Services.AddHttpClient<IExternalTagService, ExternalTagService>();
builder.Services.AddHttpClient<IWeatherService, WeatherService>();

// ─── ImportValidationService factory ─────────────────────────────────────────
builder.Services.AddScoped<ImportValidationService>(sp =>
{
    var env = sp.GetRequiredService<IWebHostEnvironment>();
    var xmlVal = sp.GetRequiredService<IXmlValidationService>();
    var xsdPath = SysPath.Combine(env.ContentRootPath, "Schemas", "tags.xsd");
    var jsonPath = SysPath.Combine(env.ContentRootPath, "Schemas", "tags-schema.json");
    return new ImportValidationService(xmlVal, xsdPath, jsonPath);
});

// ─── JWT konfiguracija ───────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret missing from appsettings.json");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                                           Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.FromHours(3)
        };
    });

builder.Services.AddAuthorization();

// ─── CORS ─────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(
    "http://localhost:5173",
    "http://localhost:3000",
    "http://frontend:5173",
    "http://frontend:80")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()));

// ─── CoreWCF SOAP ─────────────────────────────────────────────────────────────
builder.Services.AddServiceModelServices();
builder.Services.AddServiceModelMetadata();
builder.Services.AddSingleton<IServiceBehavior,
    UseRequestHeadersForMetadataAddressBehavior>();

// ─── gRPC ─────────────────────────────────────────────────────────────────────
builder.Services.AddGrpc();

// ─── GraphQL ──────────────────────────────────────────────────────────────────
builder.Services
    .AddGraphQLServer()
    .AddQueryType<Query>()
    .AddMutationType<Mutation>()
    .AddType<TagGraphType>()
    .AddAuthorization();

// ─── Controllers + Swagger ────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Tags API",
        Version = "v1",
        Description = "REST + SOAP + gRPC + GraphQL + JWT"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Upiši JWT token (bez 'Bearer' prefiksa)",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {{
        new OpenApiSecurityScheme
        {
            Reference = new OpenApiReference
            {
                Type = ReferenceType.SecurityScheme,
                Id   = "Bearer"
            }
        },
        Array.Empty<string>()
    }});
});

var app = builder.Build();

// ─── Auto-migracije ─────────────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    try
    {
        scope.ServiceProvider
             .GetRequiredService<AppDbContext>()
             .Database.Migrate();
    }
    catch (Exception ex)
    {
        scope.ServiceProvider
             .GetRequiredService<ILogger<Program>>()
             .LogError(ex, "DB migration failed");
    }
}

// ─── Middleware ───────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Tags API v1"));
}

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

// ─── SOAP ─────────────────────────────────────────────────────────────────────
app.UseServiceModel(sb =>
{
    sb.AddService<TagSoapService>(opts =>
        opts.DebugBehavior.IncludeExceptionDetailInFaults = true);
    sb.AddServiceEndpoint<TagSoapService, ITagSoapService>(
        new BasicHttpBinding(), "/soap/tags");
});
app.Services.GetRequiredService<ServiceMetadataBehavior>().HttpGetEnabled = true;

// ─── gRPC ─────────────────────────────────────────────────────────────────────
app.MapGrpcService<WeatherGrpcService>();
app.MapGet("/grpc", () => "gRPC active. Use WeatherGrpc.GetTemperature.");

// ─── GraphQL ──────────────────────────────────────────────────────────────────
app.MapGraphQL("/graphql");

// ─── REST ─────────────────────────────────────────────────────────────────────
app.MapControllers();

app.Run();