import { spawn } from 'child_process';
import path from 'path';

async function testProtocol() {
  console.log('--- Testing MCP JSON-RPC Protocol over Stdio ---');

  const tsxCli = path.resolve(process.cwd(), 'node_modules/tsx/dist/cli.mjs');
  const serverPath = path.resolve(process.cwd(), 'mcps/jacxishipping/src/index.ts');

  const proc = spawn('node', [tsxCli, serverPath], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  let buffer = '';

  const send = (msg: any) => {
    const json = JSON.stringify(msg);
    proc.stdin.write(json + '\n');
  };

  const readResponse = (): Promise<any> => {
    return new Promise((resolve) => {
      const onData = (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line) {
            try {
              const parsed = JSON.parse(line);
              proc.stdout.off('data', onData);
              buffer = lines.slice(i + 1).join('\n');
              resolve(parsed);
              return;
            } catch {
              // keep buffering
            }
          }
        }
      };
      proc.stdout.on('data', onData);
    });
  };

  // 1. Initialize
  send({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0' },
    },
  });

  const initResp = await readResponse();
  console.log('\n[1] initialize response:', initResp.result?.serverInfo);

  // Initialized notification
  send({
    jsonrpc: '2.0',
    method: 'notifications/initialized',
  });

  // 2. List tools
  send({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {},
  });

  const toolsResp = await readResponse();
  const tools = toolsResp.result?.tools || [];
  console.log('\n[2] Available MCP Tools:', tools.map((t: any) => t.name));

  // 3. Call search_vin
  send({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'search_vin',
      arguments: {
        vin: 'JTEBU5JR4A5011946',
      },
    },
  });

  const vinCallResp = await readResponse();
  console.log('\n[3] search_vin call result:');
  console.log(vinCallResp.result?.content?.[0]?.text?.slice(0, 300) + '...');

  // 4. Call search_container
  send({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'search_container',
      arguments: {
        containerNumber: 'CAAU5189072',
      },
    },
  });

  const containerCallResp = await readResponse();
  console.log('\n[4] search_container call result:');
  console.log(containerCallResp.result?.content?.[0]?.text?.slice(0, 300) + '...');

  proc.kill();
  console.log('\nMCP Protocol test completed successfully!');
}

testProtocol().catch(console.error);

