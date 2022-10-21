import { LoginState, useUser } from ".";
import { useHistory } from "react-router-dom";
import ReactGA from "react-ga4";

export function useGoogleAnalytics() {
  const { userInfo, state } = useUser();
  const history = useHistory();

  if (state !== LoginState.loading) {
    // Set info for Google Analytics and share pageview
    if (!ReactGA._hasLoadedGA) {
      ReactGA.initialize("G-CG1YDJJKV1");

      if (userInfo) {
        ReactGA.set({ userId: userInfo.id });
      }

      ReactGA.send("pageview");

      history.listen((location) => {
        ReactGA.send("pageview");
      });
    }
  }
}
