import SwiftUI

struct ContentView: View {
    var body: some View {
        WebView(url: URL(string: "https://lenka.itsprobabl.com")!)
            .ignoresSafeArea()
    }
}

#Preview {
    ContentView()
}
