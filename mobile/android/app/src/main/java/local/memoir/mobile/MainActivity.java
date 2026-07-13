package local.memoir.mobile;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(MemoirRuntimePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
