using Amazon.Lambda.Core;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace BasicCdkSetup.HelloWorldLambda
{
    public class Function
    {
        public string FunctionHandler(HelloWorldRequest request, ILambdaContext context)
        {
            Console.WriteLine("Hello " + request.Name);

            return request?.Name?.ToUpper() ?? "Hello World";
        }
    }
}