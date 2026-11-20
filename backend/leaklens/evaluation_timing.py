"""Wall-clock declarations are invalid if an observed action clock goes backwards."""


def declaration_timing(presented_at, ready_at, actions):
    observed = [presented_at]
    for action, at in actions:
        if action == 'ready':
            break  # Later actions must not change the frozen declaration's timing.
        if action != 'trial_created':
            observed.append(at)
    observed.append(ready_at)
    rollback = any(a > b for a, b in zip(observed, observed[1:]))
    return {'server_elapsed_seconds': None if rollback else (ready_at - presented_at).total_seconds(),
            'timing_invalid_reason': 'wall_clock_rollback' if rollback else None}
