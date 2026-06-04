FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files first for layer-cached restore
COPY ["TagsApi/TagsApi/TagsApi.csproj",                         "TagsApi/TagsApi/"]
COPY ["TagsApi/TagsApi.Application/TagsApi.Application.csproj", "TagsApi/TagsApi.Application/"]
COPY ["TagsApi/TagsApi.Domain/TagsApi.Domain.csproj",           "TagsApi/TagsApi.Domain/"]
COPY ["TagsApi/TagsApi.Infrastructure/TagsApi.Infrastructure.csproj", "TagsApi/TagsApi.Infrastructure/"]

RUN dotnet restore "TagsApi/TagsApi/TagsApi.csproj"

# Copy all source
COPY . .

WORKDIR "/src/TagsApi/TagsApi"
RUN dotnet publish "TagsApi.csproj" -c Release -o /app/publish --no-restore

# ─── Runtime image ────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
EXPOSE 8080
EXPOSE 8081
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "TagsApi.dll"]
