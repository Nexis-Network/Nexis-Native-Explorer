import React from "react";
import {
  useCluster,
  ClusterStatus,
  Cluster,
  useClusterModal,
} from "providers/cluster";

export function ClusterStatusBanner() {
  const [, setShow] = useClusterModal();

  return (
    <div className="container d-md-none my-4">
      <div onClick={() => setShow(true)}>
        <Button />
      </div>
    </div>
  );
}

export function ClusterStatusButton() {
  const [, setShow] = useClusterModal();

  return (
    <div onClick={() => setShow(true)}>
      <Button />
    </div>
  );
}

function Button() {
  const { status, cluster, name, customUrl } = useCluster();
  const statusName = cluster !== Cluster.Custom ? `${name}` : `${customUrl}`;

  const btnClasses = (variant: string) => {
    return `btn d-block btn-${variant} cluster-button-wrapper`;
  };

  const spinnerClasses = "spinner-grow spinner-grow-sm mr-2";

  const renderContent = () => {
    switch (status) {
      case ClusterStatus.Connected:
        return (
          <>
            <span className="fe fe-check-circle mr-2"></span>
            {statusName}
          </>
        );

      case ClusterStatus.Connecting:
        return (
          <>
            <span
              className={spinnerClasses}
              role="status"
              aria-hidden="true"
            ></span>
            {statusName}
          </>
        );

      case ClusterStatus.Failure:
        return (
          <>
            <span className="fe fe-alert-circle mr-2"></span>
            {statusName}
          </>
        );
    }
  };

  return (
    <div className="cluster-button-container">
      <span className={btnClasses("primary")}>
        {renderContent()}
      </span>
    </div>
  );
}
