import { Function, Code, Runtime } from 'aws-cdk-lib/aws-lambda'
import { SpawnSyncOptions, spawnSync } from 'child_process'
import { join } from 'path'
import { Construct } from 'constructs'
import { existsSync } from 'fs'
import { DockerImage } from 'aws-cdk-lib'

const exec = (command: string, options?: SpawnSyncOptions) => {
  const proc = spawnSync('bash', ['-c', command], options)

  if (proc.error) {
    throw proc.error
  }

  if (proc.status !== 0) {
    if (proc.stdout || proc.stderr) {
      throw new Error(
        `[Status ${proc.status}] stdout: ${proc.stdout
          ?.toString()
          .trim()}\n\n\nstderr: ${proc.stderr?.toString().trim()}`,
      )
    }
    throw new Error(`go exited with status ${proc.status}`)
  }

  return proc
}

export const getLambdaFunctionName = (entry: string) => {
  if (!existsSync(entry)) {
    throw new Error(`lambda entry doesn't exists: ${entry}❗️`)
  }

  if (entry.lastIndexOf('/') === -1) {
    return entry
  }

  return entry.substring(entry.lastIndexOf('/') + 1)
}

export const createLambdaFunction = (props: {
  scope: Construct
  name: string
  entry: string
}) => {
  const target = 'x86_64-unknown-linux-musl'

  return new Function(props.scope, props.name, {
    handler: 'main',
    runtime: Runtime.PROVIDED_AL2,
    code: Code.fromAsset(props.entry, {
      bundling: {
        command: [
          'bash',
          '-c',
          `rustup target add ${target} && cargo build --release --target ${target} && cp target/${target}/release/${props.name} /asset-output/bootstrap`,
        ],
        image: DockerImage.fromRegistry('rust:1.58-slim'),
      },
    }),
  })
}
