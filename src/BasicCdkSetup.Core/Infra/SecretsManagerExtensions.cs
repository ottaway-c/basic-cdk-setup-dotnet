using System.Text.Json;
using Amazon.SecretsManager;
using Amazon.SecretsManager.Model;

namespace BasicCdkSetup.Core.Infra;

public static class SecretsManagerExtensions
{
    public static async Task<DatabaseCredentials> GetDatabaseCredentials(this IAmazonSecretsManager secrets, string secretName)
    {
        var request = new GetSecretValueRequest { SecretId = secretName };
        var response = await secrets.GetSecretValueAsync(request);
        var value = JsonSerializer.Deserialize<DatabaseCredentials>(response.SecretString);
        return value!;
    }
}

public class DatabaseCredentials
{
    [System.Text.Json.Serialization.JsonPropertyName("dbClusterIdentifier")]
    public string? DbClusterIdentifier { get; set; }
    
    [System.Text.Json.Serialization.JsonPropertyName("password")]
    public string? Password { get; set; }
    
    [System.Text.Json.Serialization.JsonPropertyName("username")]
    public string? Username { get; set; }
    
    [System.Text.Json.Serialization.JsonPropertyName("dbname")]
    public string? DbName { get; set; }
    
    [System.Text.Json.Serialization.JsonPropertyName("host")]
    public string? Host { get; set; }
    
    [System.Text.Json.Serialization.JsonPropertyName("port")]
    public int Port { get; set; }
}