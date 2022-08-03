using Amazon.Lambda.Core;
using Amazon.Lambda.Serialization.SystemTextJson;
using Amazon.SecretsManager;
using AWS.Lambda.Powertools.Logging;
using BasicCdkSetup.Core.Infra;
using MySqlConnector;

[assembly: LambdaSerializer(typeof(DefaultLambdaJsonSerializer))]

namespace BasicCdkSetup.HelloWorldLambda;

public class HelloWorldRequest
{
    public string? Name { get; set; }
}

public class HelloWorldResponse
{
    public HelloWorldResponse(string message)
    {
        Message = message;
    }

    public string Message { get; }
}

public class Function
{
    private readonly DatabaseCredentials _databaseCredentials;
    private readonly string _proxyEndpoint;

    public Function()
    {
        var secrets = new AmazonSecretsManagerClient();
        var secretName = Environment.GetEnvironmentVariable("DATABASE_SECRET_NAME");
        
        _databaseCredentials = secrets.GetDatabaseCredentials(secretName!).GetAwaiter().GetResult();
        _proxyEndpoint = Environment.GetEnvironmentVariable("DATABASE_PROXY_ENDPOINT")!;
    }
    
    [Logging(LogEvent = true, ClearState = true)]
    public async Task<HelloWorldResponse> FunctionHandler(HelloWorldRequest request, ILambdaContext context)
    {
        Logger.LogInformation(new { Name = request.Name, Nested = new { SomeArg = 1, AnotherArg = 2 } },
            "This is a info level message");
        
        var builder = new MySqlConnectionStringBuilder
        {
            Server = _proxyEndpoint,
            UserID = _databaseCredentials.Username,
            Password = _databaseCredentials.Password,
            Database = _databaseCredentials.DbName,
        };

        await using var connection = new MySqlConnection(builder.ConnectionString);
        await connection.OpenAsync();
        
        Logger.LogInformation("Connected!");

        await using var command = new MySqlCommand("select 'hello_world' as test;", connection);
        await using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            var value = reader.GetString(0);
            Logger.LogInformation(new { result = value },"Mysql says");
        }

        var message = request.Name == null ? "Hello World" : $"Hello {request.Name}";

        return new HelloWorldResponse(message);
    }
}