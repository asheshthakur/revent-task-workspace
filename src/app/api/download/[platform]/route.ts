import { NextRequest, NextResponse } from 'next/server';

const GITHUB_DOWNLOAD_MAP: Record<string, string> = {
  'mac-arm64': 'https://github.com/asheshthakur/revent-task-workspace/releases/download/v1.0.0/VEYA-1.0.0-arm64.dmg',
  'mac-intel': 'https://github.com/asheshthakur/revent-task-workspace/releases/download/v1.0.0/VEYA-1.0.0.dmg',
  'mac': 'https://github.com/asheshthakur/revent-task-workspace/releases/download/v1.0.0/VEYA-1.0.0-arm64.dmg',
  'windows-x64': 'https://github.com/asheshthakur/revent-task-workspace/releases/download/v1.0.0/VEYA.Setup.1.0.0.exe',
  'windows': 'https://github.com/asheshthakur/revent-task-workspace/releases/download/v1.0.0/VEYA.Setup.1.0.0.exe',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const directAssetUrl = GITHUB_DOWNLOAD_MAP[platform.toLowerCase()];

  if (!directAssetUrl) {
    return new NextResponse('Platform download not found. Available: mac-arm64, mac-intel, windows-x64', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // 302 directly to the installer file asset
  return NextResponse.redirect(directAssetUrl, 302);
}
