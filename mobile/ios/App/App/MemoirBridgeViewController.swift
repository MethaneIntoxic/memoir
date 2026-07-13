import CapApp_SPM
import Capacitor

final class MemoirBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(MemoirRuntimePlugin())
    }
}
