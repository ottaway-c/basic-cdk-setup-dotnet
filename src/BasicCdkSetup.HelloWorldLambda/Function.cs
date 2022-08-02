using Amazon.Lambda.Core;
using Amazon.Lambda.Serialization.SystemTextJson;
using AWS.Lambda.Powertools.Logging;

[assembly: LambdaSerializer(typeof(DefaultLambdaJsonSerializer))]

namespace BasicCdkSetup.HelloWorldLambda
{
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
        [Logging(LogEvent = true, ClearState = true)]
        public HelloWorldResponse FunctionHandler(HelloWorldRequest request, ILambdaContext context)
        {
            Logger.LogInformation(new { Name = request.Name, Nested = new { SomeArg = 1, AnotherArg = 2 }  }, "This is a info level message");
            
            var message = request.Name == null ? "Hello World" : $"Hello {request.Name}";
            
            return new HelloWorldResponse(message);
        }
    }
}