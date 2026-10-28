FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Restore first so the layer is cached until a project file changes.
COPY Directory.Build.props Directory.Packages.props MyApp.sln ./
COPY MyApp.Api/MyApp.Api.csproj MyApp.Api/
COPY MyApp.Business/MyApp.Business.csproj MyApp.Business/
COPY MyApp.Data/MyApp.Data.csproj MyApp.Data/
COPY MyApp.Tests/MyApp.Tests.csproj MyApp.Tests/
RUN dotnet restore

COPY . .
RUN dotnet publish MyApp.Api -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "MyApp.Api.dll"]
