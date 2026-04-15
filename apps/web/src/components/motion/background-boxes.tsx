type BackgroundBoxesProps = {
  className?: string;
  boxCount?: number;
};

function joinClassNames(...classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function BackgroundBoxes({ className, boxCount = 88 }: BackgroundBoxesProps): JSX.Element {
  const boxes = Array.from({ length: boxCount }, (_, index) => {
    const delay = ((index * 37) % 110) / 13;
    const duration = 7 + (index % 6) * 0.9;

    return {
      id: index,
      delay,
      duration,
    };
  });

  return (
    <div className={joinClassNames('background-boxes', className)} aria-hidden="true">
      {boxes.map((box) => (
        <span
          key={box.id}
          className="background-boxes-cell"
          style={{
            animationDelay: `${box.delay}s`,
            animationDuration: `${box.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
