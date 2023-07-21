# Client-Side Encrypted Disaster Recovery with AWS

Welcome to the AWS Disaster Recovery Samples repository! This repository aims to provide a growing collection of AWS Cloud Development Kit (CDK) constructs and fully functional example CDK stacks to help customers set up disaster recovery configurations where backups are client-side encrypted before they are store in the cloud.

## Why was this created?

Certain data protection regulations might restrict you utilizing the cloud for disaster recovery (DR). To overcome these restrictions and meet regulatory requirements, you can 
- client-side encrypt your backups before storing them to the cloud
- store the backups in an encrypted state only at AWS
- decrypt the backups only in case of a disaster, manually transfering the key to AWS

We have created this repository to showcase CDK constructs and example stacks that demonstrate how to automate this process.

### GDPR Compliance
The ["Recommendations on measures that supplement transfer tools to ensure compliance with the EU level of protection of personal data"](https://edpb.europa.eu/sites/default/files/consultation/edpb_recommendations_202001_supplementarymeasurestransferstools_en.pdf) from the European Data Protection Board describe a "Use Case 1: Data storage for backup and other purposes that do not require access to data in the clear". If all conditions mentioned in this use-case apply, they consider "that the encryption performed provides an effective supplementary measure"

## Work in Progress
We are continuously working on expanding this repository to provide even more valuable constructs and examples for disaster recovery configurations. Our goal is to ensure that customers have access to a comprehensive set of tools and resources to address their specific needs

## What can you find in this repository?

This repository is structured into two main folders: `constructs` and `examples`. Let's explore what each of these folders contains:

### Constructs

The `constructs` folder provides CDK constructs that can be used to build disaster recovery configurations. Each construct is accompanied by a dedicated README file that provides detailed instructions on how to use it effectively. Currently, we have two constructs available:

1. **MariaDB/MySQL Construct**: This construct demonstrates how to set up disaster recovery for MariaDB or MySQL databases. The accompanying README file provides step-by-step instructions on using the construct and configuring the necessary components.

2. **OpenSearch Construct**: This construct showcases how to implement disaster recovery for OpenSearch (formerly known as Amazon Elasticsearch Service). By following the instructions in the README file, you can easily set up a resilient OpenSearch cluster for disaster recovery scenarios.

### Examples

The `examples` folder contains fully functional example CDK stacks that utilize the constructs provided in the `constructs` folder. Each example stack has its own README file, guiding you through the setup process and explaining the underlying components and configurations.

Currently, we have example stacks available for the MariaDB/MySQL construct and the OpenSearch construct. These examples serve as practical references to help you understand how to integrate the constructs into your own disaster recovery setups.

## Getting Started

To get started with this repository, follow these steps:

1. Clone the repository to your local machine using the following command:
   ```
   git clone https://github.com/your-username/aws-samples.git
   ```

2. Explore the `constructs` folder to find the CDK constructs that suit your requirements. Refer to the README file in each construct's folder for detailed instructions on usage.

3. If you prefer to see the constructs in action, navigate to the `examples` folder. Each example stack has its own folder, along with a dedicated README file explaining how to deploy and configure the stack effectively.

4. Follow the instructions provided in the README files of the constructs and examples to set up your desired disaster recovery configurations.



## Contributions

We welcome contributions to this repository! If you have ideas for new constructs or example stacks, or if you have found improvements or issues with the existing code, please feel free to contribute. Fork the repository, make your changes, and submit a pull request. We appreciate your input and strive to create a collaborative environment.

## License

This repository is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute the code provided here, subject to the terms and conditions of the license.

## Feedback and Support

If you have any feedback, questions, or need support related to this repository, please open an issue on the GitHub repository page. We value your feedback and will do our best to address any concerns.