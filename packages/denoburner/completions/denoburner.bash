_denoburner_completions() {
  local cur prev commands
  commands="dev build download servers init exec"

  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"

  if [[ $COMP_CWORD -eq 1 ]]; then
    COMPREPLY=($(compgen -W "$commands" -- "$cur"))
    return 0
  fi

  case "${COMP_WORDS[1]}" in
    dev|build|download|servers|init|exec)
      COMPREPLY=($(compgen -W "--port --host --server --config --quiet --verbose --no-types --dry-run -c" -- "$cur"))
      ;;
  esac
}

complete -F _denoburner_completions denoburner
