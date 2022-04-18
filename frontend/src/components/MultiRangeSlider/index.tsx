import * as React from "react";
import RcSlider, { SliderProps as RcSliderProps } from "rc-slider";
import classNames from "classnames";
import { TooltipPlacement } from "antd/lib/tooltip";
import { SliderBaseProps } from "antd/lib/slider";
import SliderTooltip from "antd/lib/slider/SliderTooltip";
import { ConfigContext } from "antd/lib/config-provider";
import { SliderRef } from "rc-slider/lib/Slider";

interface SliderRange {
  draggableTrack?: boolean;
}

export interface SliderMultiRangeProps extends SliderBaseProps {
  range: true | SliderRange;
  value?: number | number[];
  defaultValue?: number | number[];
  onChange?: (value: number | number[]) => void;
  handleStyle?: React.CSSProperties[];
  trackStyle?: React.CSSProperties[];
}

export type Visibles = { [index: number]: boolean };

export const MultiRangeSlider = React.forwardRef<
  SliderRef,
  SliderMultiRangeProps
>((props: SliderMultiRangeProps, ref: React.ForwardedRef<SliderRef>) => {
  const { getPrefixCls, direction, getPopupContainer } =
    React.useContext(ConfigContext);
  const [visibles, setVisibles] = React.useState<Visibles>({});

  const toggleTooltipVisible = (index: number, visible: boolean) => {
    setVisibles((prev: Visibles) => ({ ...prev, [index]: visible }));
  };

  const getTooltipPlacement = (
    tooltipPlacement?: TooltipPlacement,
    vertical?: boolean
  ) => {
    if (tooltipPlacement) {
      return tooltipPlacement;
    }
    if (!vertical) {
      return "top";
    }
    return direction === "rtl" ? "left" : "right";
  };

  const {
    prefixCls: customizePrefixCls,
    tooltipPrefixCls: customizeTooltipPrefixCls,
    range,
    className,
    ...restProps
  } = props;
  const prefixCls = getPrefixCls("slider", customizePrefixCls);
  const tooltipPrefixCls = getPrefixCls("tooltip", customizeTooltipPrefixCls);
  const cls = classNames(className, {
    [`${prefixCls}-rtl`]: direction === "rtl",
  });

  // make reverse default on rtl direction
  if (direction === "rtl" && !restProps.vertical) {
    restProps.reverse = !restProps.reverse;
  }

  // Range config
  const [mergedRange, draggableTrack] = React.useMemo(() => {
    if (!range) {
      return [false];
    }

    return typeof range === "object"
      ? [true, range.draggableTrack]
      : [true, false];
  }, [range]);

  const handleRender: RcSliderProps["handleRender"] = (node, info) => {
    const { index, dragging } = info;

    const rootPrefixCls = getPrefixCls();
    const {
      tipFormatter,
      tooltipVisible,
      tooltipPlacement,
      getTooltipPopupContainer,
      vertical,
    } = props;

    const isTipFormatter = tipFormatter ? visibles[index] || dragging : false;
    const visible =
      tooltipVisible || (tooltipVisible === undefined && isTipFormatter);

    const passedProps = {
      ...node.props,
      onMouseEnter: () => toggleTooltipVisible(index, true),
      onMouseLeave: () => toggleTooltipVisible(index, false),
    };

    return (
      <SliderTooltip
        prefixCls={tooltipPrefixCls}
        title={tipFormatter ? tipFormatter(info.value) : ""}
        visible={visible}
        placement={getTooltipPlacement(tooltipPlacement, vertical)}
        transitionName={`${rootPrefixCls}-zoom-down`}
        key={index}
        overlayClassName={`${prefixCls}-tooltip`}
        getPopupContainer={getTooltipPopupContainer || getPopupContainer}
      >
        {React.cloneElement(node, passedProps)}
      </SliderTooltip>
    );
  };

  return (
    <RcSlider
      {...(restProps as SliderMultiRangeProps)}
      step={restProps.step}
      range={mergedRange}
      draggableTrack={draggableTrack}
      className={cls}
      ref={ref}
      prefixCls={prefixCls}
      handleRender={handleRender}
    />
  );
});

MultiRangeSlider.displayName = "MultiRangeSlider";

MultiRangeSlider.defaultProps = {
  tipFormatter(value: number | undefined) {
    return typeof value === "number" ? value.toString() : "";
  },
};
