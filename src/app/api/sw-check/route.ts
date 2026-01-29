import { NextResponse } from 'next/server'

export async function GET() {
    // Return info about what the client should expect
    return NextResponse.json({
        message: 'Service worker should be bundled with webpack',
        buildTime: new Date().toISOString(),
        expectedSwStart: '(()=>{"use strict";',
        note: 'If your sw.js starts with "if(!self.define)" it is the OLD broken version'
    })
}
