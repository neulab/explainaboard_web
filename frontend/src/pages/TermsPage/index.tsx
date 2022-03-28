import React from "react";

import logo from "../../logo-full.png";
import "./index.css";

export function TermsPage() {
  return (
    <div className="h-full flex items-center">
      <div
        className="w-full h-full bg-center bg-cover"
        style={{ backgroundImage: `url(${logo})` }}
      >
        <div className="w-full h-full bg-opacity-60 items-center flex">
          <div className="text-center ml-auto mr-auto">
            <h1 className="text-white text-6xl mb-0">
              ExplainaBoard Terms of Use
            </h1>
            <div className="relative flex flex-col min-w-0 break-words bg-white py-3 mx-20 rounded-lg">
              <p className="text-l text-left">
                Thank you for your interest in ExplainaBoard!
              </p>
              <p className="text-l text-left">
                By using the ExplainaBoard web interface, or any associated
                software, tools, APIs, or data (hereafter collectively,
                &quot;ExplainaBoard&quot;), you enter an agreement with Inspired
                Cognition Inc. (hereafter &quot;the site operator&quot; or
                &quot;us&quot;) to be bound by and comply with the following
                terms. These terms may change over the course of your usage of
                ExplainaBoard, and continuing usage after any changes indicates
                your agreement to these terms.
              </p>
              <h2 className="text-3xl">Credentials and Access</h2>
              <p className="text-l text-left">
                In order to access ExplainaBoard, you must obtain credentials
                such as an account or API key. You agree to provide truthful
                information in obtaining these credentials, and access
                ExplainaBoard only within the scope of your allowed credentials.
              </p>
              <h2 className="text-3xl">Data Usage</h2>
              <p className="text-l text-left">
                By submitting any data to ExplainBoard, you grant Inspired
                Cognition Inc. permission to store, use, process, or analyze
                this data for any purpose. In addition, by marking any data
                &quot;public&quot; you agree to allow the site operator to
                publicly distribute the data in any form for any purpose.
              </p>
              <h2 className="text-3xl">
                Indemnification, Disclaimer, and Limitation of Liability
              </h2>
              <p className="text-l text-left">
                (a) Indemnity. You agree to defend, indemnify, and hold harmless
                us, our affiliates, and each of our employees, officers,
                directors, agents and representatives, from and against all
                claims, damages, losses, liabilities, judgments, penalties,
                fines, costs, and expenses (including attorneys’ fees) arising
                from or relating to: (i) your breach of these Terms; (ii) your
                use of ExplainaBoard, Content, and Developer Documentation;
                (iii) your Application; (iv) any content or data routed into or
                used with ExplainaBoard by you, those acting on your behalf, or
                your end users; (v) your actual or alleged infringement,
                misappropriation or violation of Inspired Cognition, its
                affiliate’s or any third party’s intellectual property or
                proprietary rights.
              </p>
              <p className="text-l text-left">
                (b) Disclaimer. EXPLAINABOARD IS LICENSED ON AN &quot;AS
                IS&quot; AND &quot;AS-AVAILABLE&quot; BASIS. INSPIRED COGNITION
                AND ITS AFFILIATES MAKE NO WARRANTIES (EXPRESS, IMPLIED,
                STATUTORY OR OTHERWISE) WITH RESPECT TO EXPLAINABOARD, AND
                EXPRESSLY DISCLAIMS ALL IMPLIED WARRANTIES INCLUDING BUT NOT
                LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
                PARTICULAR PURPOSE, SATISFACTORY QUALITY, NON-INFRINGEMENT, AND
                QUIET ENJOYMENT, AND ANY WARRANTIES ARISING OUT OF ANY COURSE OF
                DEALING, PERFORMANCE, OR TRADE USAGE. INSPIRED COGNITION AND ITS
                AFFILIATES DO NOT WARRANT THAT EXPLAINABOARD WILL BE
                UNINTERRUPTED, ACCURATE OR ERROR FREE OR SUCCEED IN RESOLVING
                ANY PROBLEM. YOU AGREE THAT USE OF EXPLAINABOARD IS AT YOUR OWN
                RISK. YOU HAVE NO WARRANTY OR GUARANTEE UNDER THESE TERMS THAT
                THE OPERABILITY OF ANY OF YOUR APPLICATIONS RUNNING WITH
                EXPLAINABOARD WILL BE MAINTAINED WITH ANY SUBSEQUENT OR
                GENERALLY AVAILABLE VERSIONS OF EXPLAINABOARD OR THAT ANY
                VERSION OF EXPLAINABOARD WILL EVER BE MADE AVAILABLE OR
                MARKETED. WE MAY DISCONTINUE PROVIDING EXPLAINABOARD OR ACCESS
                TO OUR SYSTEM OR MAY CHANGE THE NATURE FEATURES, FUNCTIONS,
                SCOPE OR OPERATION THEREOF, AT ANY TIME AND FROM TIME TO TIME.
                NEITHER WE NOR ANY OF OUR AFFILIATES OR LICENSORS WARRANT THAT
                THE SERVICE OFFERINGS WILL CONTINUE TO BE PROVIDED, WILL
                FUNCTION AS DESCRIBED, CONSISTENTLY OR IN ANY PARTICULAR MANNER,
                OR WILL BE UNINTERRUPTED, ACCURATE, ERROR FREE OR FREE OF
                HARMFUL COMPONENTS.
              </p>
              <p className="text-l text-left">
                (c) Limitations of Liability. NEITHER WE NOR ANY OF OUR
                AFFILIATES OR LICENSORS WILL BE LIABLE FOR ANY DIRECT, INDIRECT,
                INCIDENTAL, SPECIAL, CONSEQUENTIAL OR EXEMPLARY DAMAGES,
                INCLUDING, BUT NOT LIMITED TO, DAMAGES FOR LOSS OF PROFITS,
                GOODWILL, USE, OR DATA OR OTHER LOSSES (EVEN IF WE HAVE BEEN
                ADVISED OF THE POSSIBILITY OF SUCH DAMAGES) IN CONNECTION WITH
                THESE TERMS. IN ANY CASE, OUR AGGREGATE LIABILITY UNDER THESE
                TERMS SHALL BE LIMITED TO $100.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
