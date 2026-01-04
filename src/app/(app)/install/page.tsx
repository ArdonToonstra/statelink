import { Card } from "@/components/ui/card"
import { Monitor, Smartphone, Share, MoreVertical, PlusSquare } from "lucide-react"

export default function InstallPage() {
    return (
        <div className="container max-w-2xl mx-auto p-4 space-y-6">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Install Statelink</h1>
                <p className="text-muted-foreground">
                    Add Statelink to your home screen for the best experience.
                </p>
            </div>

            <div className="grid gap-6">
                {/* iOS Instructions */}
                <Card>
                    <div className="flex flex-col gap-4">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 font-semibold leading-none tracking-tight">
                                <Smartphone className="h-6 w-6" />
                                iOS (iPhone & iPad)
                            </div>
                            <div className="text-sm text-muted-foreground">Install using Safari</div>
                        </div>
                        <div className="space-y-4">
                            <ol className="list-decimal list-inside space-y-2 text-sm">
                                <li>Open <strong>Statelink</strong> in Safari</li>
                                <li>Tap the <strong>Share</strong> button <Share className="inline h-4 w-4 mx-1" /> at the bottom of the screen</li>
                                <li>Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="inline h-4 w-4 mx-1" /></li>
                                <li>Tap <strong>Add</strong> in the top right corner</li>
                            </ol>
                        </div>
                    </div>
                </Card>

                {/* Android Instructions */}
                <Card>
                    <div className="flex flex-col gap-4">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 font-semibold leading-none tracking-tight">
                                <Smartphone className="h-6 w-6" />
                                Android
                            </div>
                            <div className="text-sm text-muted-foreground">Install using Chrome</div>
                        </div>
                        <div className="space-y-4">
                            <ol className="list-decimal list-inside space-y-2 text-sm">
                                <li>Open <strong>Statelink</strong> in Chrome</li>
                                <li>Tap the <strong>Menu</strong> icon <MoreVertical className="inline h-4 w-4 mx-1" /> in the top right corner</li>
                                <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong></li>
                                <li>Follow the prompt to install</li>
                            </ol>
                        </div>
                    </div>
                </Card>

                {/* Desktop Instructions */}
                <Card>
                    <div className="flex flex-col gap-4">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 font-semibold leading-none tracking-tight">
                                <Monitor className="h-6 w-6" />
                                Desktop (Chrome, Edge)
                            </div>
                            <div className="text-sm text-muted-foreground">Install on your computer</div>
                        </div>
                        <div className="space-y-4">
                            <ol className="list-decimal list-inside space-y-2 text-sm">
                                <li>Look for the <strong>Install</strong> icon in the address bar (right side)</li>
                                <li>Click the icon and select <strong>Install</strong></li>
                            </ol>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}

