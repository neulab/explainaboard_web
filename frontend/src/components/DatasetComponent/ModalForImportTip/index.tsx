import { Button, Modal } from "antd";
import React, { useState } from "react";

interface Props {
  dataset_name: string;
  sub_dataset: string;
}

export function ModalForImportTip(props: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleOk = () => {
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const text =
    props.sub_dataset === ""
      ? 'dataset = load_dataset("' + props.dataset_name + '")'
      : 'dataset = load_dataset("' +
        props.dataset_name +
        '" , "' +
        props.sub_dataset +
        '")';

  return (
    <>
      <Button size="small" onClick={showModal}>
        usage
      </Button>
      <Modal
        title="usage"
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <p>from datalabs import load_dataset</p>
        <p>{text}</p>
      </Modal>
    </>
  );
}
